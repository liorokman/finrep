package mcpsrv

import (
	"io"
	"os"
)

func stdin() io.Reader  { return os.Stdin }
func stdout() io.Writer { return os.Stdout }
