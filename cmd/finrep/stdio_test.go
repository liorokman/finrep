package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/mark3labs/mcp-go/client"
	"github.com/mark3labs/mcp-go/mcp"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/store"
)

// TestMCPStdioSubprocess builds the real binary and talks to it the way an agent host would: as a
// subprocess speaking the protocol on stdin/stdout.
func TestMCPStdioSubprocess(t *testing.T) {
	if testing.Short() {
		t.Skip("builds the binary")
	}
	dir := t.TempDir()
	bin := filepath.Join(dir, "finrep")
	if out, err := exec.Command("go", "build", "-o", bin, ".").CombinedOutput(); err != nil {
		t.Fatalf("build: %v\n%s", err, out)
	}
	dbPath := filepath.Join(dir, "f.db")
	ctx := context.Background()
	st, err := store.Open(ctx, dbPath)
	if err != nil {
		t.Fatal(err)
	}
	acc := &ledger.Account{Name: "Leumi", Type: ledger.Bank, Institution: "Leumi", Owner: "Alice"}
	if err := ledger.New(st).CreateAccount(ctx, acc); err != nil {
		t.Fatal(err)
	}
	st.Close()

	c, err := client.NewStdioMCPClient(bin, os.Environ(), "--mode=mcp", "--db-path="+dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	cctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	init := mcp.InitializeRequest{}
	init.Params.ProtocolVersion = mcp.LATEST_PROTOCOL_VERSION
	init.Params.ClientInfo = mcp.Implementation{Name: "test", Version: "1"}
	if _, err := c.Initialize(cctx, init); err != nil {
		t.Fatalf("initialize (stdout must carry only the protocol): %v", err)
	}
	tools, err := c.ListTools(cctx, mcp.ListToolsRequest{})
	if err != nil || len(tools.Tools) != 9 {
		t.Fatalf("%d tools, %v", len(tools.Tools), err)
	}
	req := mcp.CallToolRequest{}
	req.Params.Name = "list_accounts"
	res, err := c.CallTool(cctx, req)
	if err != nil || res.IsError {
		t.Fatalf("%v %+v", err, res)
	}
	if text := res.Content[0].(mcp.TextContent).Text; !strings.Contains(text, `"name":"Leumi"`) || !strings.Contains(text, `"owner":"Alice"`) {
		t.Fatalf("%s", text)
	}
}

// TestMCPStdoutCarriesOnlyTheProtocol reads the raw stdout of the subprocess. Client libraries tend to
// skip lines they cannot parse, so this is the check that a stray print or log line cannot slip through.
func TestMCPStdoutCarriesOnlyTheProtocol(t *testing.T) {
	if testing.Short() {
		t.Skip("builds the binary")
	}
	dir := t.TempDir()
	bin := filepath.Join(dir, "finrep")
	if out, err := exec.Command("go", "build", "-o", bin, ".").CombinedOutput(); err != nil {
		t.Fatalf("build: %v\n%s", err, out)
	}
	cmd := exec.Command(bin, "--mode=mcp", "--db-path="+filepath.Join(dir, "f.db"))
	in, _ := cmd.StdinPipe()
	out, _ := cmd.StdoutPipe()
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	done := make(chan struct{})
	go func() { cmd.Wait(); close(done) }()
	// stop ends the process and only then reads stderr, which exec fills from its own goroutine.
	stop := func() string {
		in.Close()
		cmd.Process.Kill()
		<-done
		return stderr.String()
	}
	defer stop()

	io.WriteString(in, `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}`+"\n")
	io.WriteString(in, `{"jsonrpc":"2.0","method":"notifications/initialized"}`+"\n")
	io.WriteString(in, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`+"\n")

	lines := make(chan string)
	go func() {
		sc := bufio.NewScanner(out)
		sc.Buffer(make([]byte, 1<<20), 1<<20)
		for sc.Scan() {
			lines <- sc.Text()
		}
		close(lines)
	}()
	got := 0
	timeout := time.After(30 * time.Second)
	for got < 2 {
		select {
		case l, ok := <-lines:
			if !ok {
				t.Fatalf("stdout closed early; stderr: %s", stop())
			}
			var msg struct {
				JSONRPC string `json:"jsonrpc"`
				ID      any    `json:"id"`
			}
			if err := json.Unmarshal([]byte(l), &msg); err != nil || msg.JSONRPC != "2.0" {
				t.Fatalf("stdout line is not JSON-RPC: %q", l)
			}
			got++
		case <-timeout:
			t.Fatalf("timed out; stderr: %s", stop())
		}
	}
	if logs := stop(); !strings.Contains(logs, "serving MCP on stdio") {
		t.Errorf("logs should go to stderr, got %q", logs)
	}
}
