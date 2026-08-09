package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/liorokman/finrep/internal/ccpdf"
)

func main() {
	var (
		providerFlag = flag.String("provider", "", "Target provider [REQUIRED]: isracard, cal, or leumi")
		dirFlag      = flag.String("dir", "", "Directory containing PDF statement files to process")
		outFlag      = flag.String("out", "", "Output CSV file path (defaults to stdout)")
		verboseFlag  = flag.Bool("verbose", false, "Enable verbose logging")
	)

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: ccpdf2csv -provider <isracard|cal|leumi> [options] <pdf-file-1> [pdf-file-2 ...]\n\n")
		fmt.Fprintf(os.Stderr, "Transforms credit card & bank PDF statements for a specified provider into a single combined CSV file.\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
	}

	flag.Parse()

	// Require -provider parameter explicitly
	providerClean := strings.ToLower(strings.TrimSpace(*providerFlag))
	if providerClean == "" || (providerClean != "isracard" && providerClean != "cal" && providerClean != "leumi") {
		fmt.Fprintf(os.Stderr, "Error: -provider flag is REQUIRED and must be one of: isracard, cal, leumi.\n\n")
		flag.Usage()
		os.Exit(1)
	}

	// Gather target PDF file paths from positional args and -dir flag
	pdfFiles := gatherPDFFiles(flag.Args(), *dirFlag)
	if len(pdfFiles) == 0 {
		fmt.Fprintf(os.Stderr, "Error: No PDF files provided. Specify PDF file paths as arguments or set -dir <directory>.\n\n")
		flag.Usage()
		os.Exit(1)
	}

	var allTransactions []ccpdf.ParsedTransaction
	processedFilesCount := 0

	for _, file := range pdfFiles {
		pdfData, err := ccpdf.ExtractTextFromPDF(file)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading PDF '%s': %v\n", file, err)
			continue
		}

		parser, err := ccpdf.ResolveParser(providerClean, pdfData)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error obtaining parser for '%s': %v\n", file, err)
			continue
		}

		txs, err := parser.Parse(pdfData)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing transactions from '%s': %v\n", file, err)
			continue
		}

		if *verboseFlag {
			fmt.Fprintf(os.Stderr, "Processed '%s' using provider %s: %d transactions extracted\n", file, parser.Name(), len(txs))
		}

		allTransactions = append(allTransactions, txs...)
		processedFilesCount++
	}

	if len(allTransactions) == 0 {
		fmt.Fprintf(os.Stderr, "Warning: No transactions extracted from %d processed PDF file(s).\n", processedFilesCount)
	}

	// Prepare output writer
	var outWriter io.Writer = os.Stdout
	if *outFlag != "" {
		f, err := os.Create(*outFlag)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating output CSV file '%s': %v\n", *outFlag, err)
			os.Exit(1)
		}
		defer f.Close()
		outWriter = f
	}

	// Write single combined CSV output
	if err := ccpdf.WriteCombinedCSV(outWriter, allTransactions); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing CSV output: %v\n", err)
		os.Exit(1)
	}

	if *outFlag != "" {
		fmt.Fprintf(os.Stderr, "Successfully processed %d PDF file(s). Wrote %d combined transactions to '%s'\n",
			processedFilesCount, len(allTransactions), *outFlag)
	}
}

func gatherPDFFiles(args []string, dir string) []string {
	var files []string
	seen := make(map[string]bool)

	addFile := func(path string) {
		clean := filepath.Clean(path)
		if !seen[clean] && strings.ToLower(filepath.Ext(clean)) == ".pdf" {
			seen[clean] = true
			files = append(files, clean)
		}
	}

	for _, arg := range args {
		info, err := os.Stat(arg)
		if err != nil {
			continue
		}
		if info.IsDir() {
			_ = filepath.Walk(arg, func(p string, i os.FileInfo, err error) error {
				if err == nil && !i.IsDir() {
					addFile(p)
				}
				return nil
			})
		} else {
			addFile(arg)
		}
	}

	if dir != "" {
		_ = filepath.Walk(dir, func(p string, i os.FileInfo, err error) error {
			if err == nil && !i.IsDir() {
				addFile(p)
			}
			return nil
		})
	}

	return files
}
