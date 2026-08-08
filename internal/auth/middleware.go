package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/liorokman/finrep/internal/config"
)

type UserContext struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

const UserContextKey = "user_context"

// AuthMiddleware enforces OIDC authentication or injects dev mode user
func AuthMiddleware(cfg *config.Config) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			path := c.Path()

			// 1. Check session cookie and inject user context if valid
			cookie, err := c.Cookie("finrep_session")
			if err == nil && cookie.Value != "" {
				sessData := decodeSession(cookie.Value)
				if sessData != nil {
					user := &UserContext{
						ID:    sessData.ID,
						Name:  sessData.Name,
						Email: sessData.Email,
					}
					c.Set(UserContextKey, user)
				}
			}

			// Dev Mode Bypass
			if !cfg.OIDCEnabled {
				user := &UserContext{
					ID:    "dev-admin",
					Name:  "Local Admin (Dev Mode)",
					Email: "admin@local.dev",
				}
				c.Set(UserContextKey, user)
				return next(c)
			}

			// 2. Bypass auth enforcement for auth endpoints and static routes
			if path == "/auth/login" || path == "/auth/callback" || path == "/auth/logout" ||
				path == "/api/v1/auth/login" || path == "/api/v1/auth/callback" || path == "/api/v1/auth/info" ||
				path == "/login" {
				return next(c)
			}

			// 3. If user is authenticated, proceed
			if c.Get(UserContextKey) != nil {
				return next(c)
			}

			// 4. Unauthenticated request
			if strings.HasPrefix(path, "/api") {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Authentication required. Please log in via OIDC.",
				})
			}

			// For browser page navigation, redirect to /login page
			return c.Redirect(http.StatusFound, "/login")
		}
	}
}

// GetUser returns authenticated user from context
func GetUser(c echo.Context) *UserContext {
	u, ok := c.Get(UserContextKey).(*UserContext)
	if !ok {
		return nil
	}
	return u
}
