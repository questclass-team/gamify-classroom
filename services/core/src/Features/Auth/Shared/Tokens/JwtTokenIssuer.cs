using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Auth.Shared.Tokens
{
    public sealed class JwtTokenIssuer : IJwtTokenIssuer
    {
        private readonly JwtOptions _options;
        private readonly TimeProvider _timeProvider;
        private readonly SigningCredentials _signingCredentials;
        private readonly JsonWebTokenHandler _tokenHandler = new()
        {
            // Times come from TimeProvider below, not from the system clock.
            SetDefaultTimesOnTokenCreation = false
        };

        public JwtTokenIssuer(IOptions<JwtOptions> options, TimeProvider timeProvider)
        {
            _options = options.Value;
            _timeProvider = timeProvider;
            _signingCredentials = new SigningCredentials(
                JwtValidation.CreateSigningKey(_options),
                SecurityAlgorithms.HmacSha256);
        }

        public AccessToken Issue(User user)
        {
            var now = _timeProvider.GetUtcNow();
            // JWT stores whole seconds, so the reported expiry matches the "exp" claim exactly.
            var expiresAt = DateTimeOffset.FromUnixTimeSeconds(
                now.AddMinutes(_options.AccessTokenLifetimeMinutes).ToUnixTimeSeconds());

            var descriptor = new SecurityTokenDescriptor
            {
                Issuer = _options.Issuer,
                Audience = _options.Audience,
                IssuedAt = now.UtcDateTime,
                NotBefore = now.UtcDateTime,
                Expires = expiresAt.UtcDateTime,
                SigningCredentials = _signingCredentials,
                Claims = new Dictionary<string, object>
                {
                    [AuthClaims.UserId] = user.Id.ToString(),
                    [AuthClaims.Login] = user.Login,
                    [AuthClaims.Name] = $"{user.FirstName} {user.LastName}",
                    [AuthClaims.Role] = user.Role.ToApiName(),
                    [AuthClaims.TokenId] = Guid.NewGuid().ToString()
                }
            };

            return new AccessToken(_tokenHandler.CreateToken(descriptor), expiresAt);
        }
    }
}
