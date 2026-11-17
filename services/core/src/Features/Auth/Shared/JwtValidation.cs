using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>The single definition of what makes an access token valid.</summary>
    public static class JwtValidation
    {
        public static SymmetricSecurityKey CreateSigningKey(JwtOptions options)
        {
            return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Secret));
        }

        public static TokenValidationParameters CreateParameters(JwtOptions options)
        {
            return new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = CreateSigningKey(options),
                // Pinned: a token that claims another algorithm (e.g. "none") is rejected.
                ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                RequireSignedTokens = true,

                ValidateIssuer = true,
                ValidIssuer = options.Issuer,
                ValidateAudience = true,
                ValidAudience = options.Audience,

                ValidateLifetime = true,
                RequireExpirationTime = true,
                // The default is 5 minutes, which would let a 15-minute token live for 20.
                ClockSkew = TimeSpan.FromSeconds(30),

                NameClaimType = AuthClaims.Name,
                RoleClaimType = AuthClaims.Role
            };
        }
    }
}
