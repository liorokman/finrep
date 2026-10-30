package api

import (
	"sort"
	"sync"
	"time"

	"github.com/liorokman/finrep/internal/authn"
	"github.com/liorokman/finrep/internal/importer"
)

const (
	maxStaged = 20
	stagedTTL = 15 * time.Minute
)

type staged struct {
	parsed   *importer.Parsed
	filename string
	created  time.Time
}

// stagingArea keeps parsed uploads in memory between "preview" and "commit", so a file is uploaded
// and parsed once. It is bounded in count and age; the oldest entry is dropped when full.
type stagingArea struct {
	mu    sync.Mutex
	now   func() time.Time
	items map[string]*staged
}

func newStagingArea(now func() time.Time) *stagingArea {
	return &stagingArea{now: now, items: map[string]*staged{}}
}

func (a *stagingArea) put(p *importer.Parsed, filename string) string {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.expire()
	for len(a.items) >= maxStaged {
		type kv struct {
			id string
			at time.Time
		}
		var all []kv
		for id, s := range a.items {
			all = append(all, kv{id, s.created})
		}
		sort.Slice(all, func(i, j int) bool { return all[i].at.Before(all[j].at) })
		delete(a.items, all[0].id)
	}
	id := authn.RandomToken(16)
	a.items[id] = &staged{parsed: p, filename: filename, created: a.now()}
	return id
}

func (a *stagingArea) get(id string) (*staged, bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.expire()
	s, ok := a.items[id]
	return s, ok
}

func (a *stagingArea) drop(id string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.items, id)
}

func (a *stagingArea) expire() {
	cutoff := a.now().Add(-stagedTTL)
	for id, s := range a.items {
		if s.created.Before(cutoff) {
			delete(a.items, id)
		}
	}
}
