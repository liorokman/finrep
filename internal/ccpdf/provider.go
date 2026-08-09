package ccpdf

import (
	"fmt"
	"strings"
)

const (
	ProviderIsracard = "ISRACARD"
	ProviderCal      = "CAL"
	ProviderLeumi    = "LEUMI"
)

// ProviderParser interface for credit card / bank statement parsers
type ProviderParser interface {
	Name() string
	Parse(data *PDFData) ([]ParsedTransaction, error)
}

// ResolveParser returns the matching parser for an explicit provider name
func ResolveParser(requestedProvider string, data *PDFData) (ProviderParser, error) {
	return ResolveParserWithClient(requestedProvider, data, nil)
}

// ResolveParserWithClient returns the matching parser configured with an optional LocalAI client
func ResolveParserWithClient(requestedProvider string, data *PDFData, client *LocalAIClient) (ProviderParser, error) {
	req := strings.ToUpper(strings.TrimSpace(requestedProvider))

	switch req {
	case ProviderIsracard, "ISRACARD_PDF":
		return &IsracardParser{LocalAI: client}, nil
	case ProviderCal, "VISACAL", "VISA_CAL":
		return &CalParser{LocalAI: client}, nil
	case ProviderLeumi, "LEUMI_BANK":
		return &LeumiParser{LocalAI: client}, nil
	default:
		return nil, fmt.Errorf("provider '-provider %s' is not supported. Choose one of: isracard, cal, leumi", requestedProvider)
	}
}
