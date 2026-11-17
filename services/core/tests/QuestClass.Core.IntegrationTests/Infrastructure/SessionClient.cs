using System.Net.Http.Json;
using Microsoft.Net.Http.Headers;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Jwt;
using QuestClass.Core.Features.Auth.Shared.RefreshTokens;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    /// <summary>
    /// Drives login / refresh / logout with the refresh cookie passed by hand, so tests can keep an old cookie
    /// and send it again (as a thief with a copy would).
    /// </summary>
    public sealed class SessionClient
    {
        private readonly HttpClient _client;

        public SessionClient(HttpClient client)
        {
            _client = client;
        }

        public async Task<(string AccessToken, string RefreshCookie)> LoginAsync(string login)
        {
            var response = await _client.PostAsJsonAsync("/api/core/auth/login", new { login, password = "haslo" });
            response.EnsureSuccessStatusCode();

            var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            var cookie = FindRefreshCookie(response).ShouldNotBeNull();

            return (body.AccessToken, cookie.Value.ToString());
        }

        public Task<HttpResponseMessage> RefreshAsync(string? refreshCookie)
        {
            return SendWithCookieAsync("/api/core/auth/refresh", refreshCookie);
        }

        public Task<HttpResponseMessage> LogoutAsync(string? refreshCookie)
        {
            return SendWithCookieAsync("/api/core/auth/logout", refreshCookie);
        }

        /// <summary>The refresh cookie set by the response, or null when the response does not touch it.</summary>
        public static SetCookieHeaderValue? FindRefreshCookie(HttpResponseMessage response)
        {
            return response.Headers.TryGetValues(HeaderNames.SetCookie, out var values)
                ? SetCookieHeaderValue.ParseList(values.ToList())
                    .SingleOrDefault(cookie => cookie.Name == RefreshTokenCookie.Name)
                : null;
        }

        private Task<HttpResponseMessage> SendWithCookieAsync(string url, string? refreshCookie)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, url);

            if (refreshCookie is not null)
            {
                request.Headers.Add(HeaderNames.Cookie, $"{RefreshTokenCookie.Name}={refreshCookie}");
            }

            return _client.SendAsync(request);
        }
    }
}
