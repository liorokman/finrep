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
			reqPath := c.Request().URL.Path

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

			// 2. Bypass auth enforcement for auth endpoints, login page, and static assets
			if reqPath == "/login" ||
				strings.HasPrefix(reqPath, "/auth/") ||
				strings.HasPrefix(reqPath, "/assets/") ||
				reqPath == "/favicon.ico" ||
				reqPath == "/api/v1/auth/info" {
				return next(c)
			}

			// 3. If user is authenticated, proceed
			if c.Get(UserContextKey) != nil {
				return next(c)
			}

			// 4. Unauthenticated request
			if strings.HasPrefix(reqPath, "/api/") || strings.HasPrefix(c.Path(), "/api/") {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Authentication required. Please log in via OIDC.",
				})
			}

			// For browser page navigation (e.g. "/"), redirect to /login
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
