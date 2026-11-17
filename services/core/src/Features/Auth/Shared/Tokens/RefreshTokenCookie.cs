namespace QuestClass.Core.Features.Auth.Shared.Tokens
{
    /// <summary>
    /// The refresh token lives only in this cookie: HttpOnly (JavaScript cannot read it, so XSS cannot steal it),
    /// Secure, SameSite=Strict (not sent from other sites) and limited to the auth endpoints.
    /// Browsers treat http://localhost as secure, so Secure also works in local development.
    /// </summary>
    public static class RefreshTokenCookie
    {
        public const string Name = "qc_refresh";

        public const string Path = "/api/core/auth";

        public static void Append(HttpResponse response, IssuedRefreshToken refreshToken)
        {
            response.Cookies.Append(Name, refreshToken.Token, CreateOptions(refreshToken.ExpiresAt));
        }

        public static void Delete(HttpResponse response)
        {
            response.Cookies.Delete(Name, CreateOptions(expiresAt: null));
        }

        public static string? Read(HttpRequest request)
        {
            return request.Cookies.TryGetValue(Name, out var token) && !string.IsNullOrWhiteSpace(token)
                ? token
                : null;
        }

        private static CookieOptions CreateOptions(DateTimeOffset? expiresAt)
        {
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = Path,
                Expires = expiresAt,
                IsEssential = true
            };
        }
    }
}
