using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace QuestClass.Core.Features.Auth.Shared.Tokens
{
    public static class RefreshTokenGenerator
    {
        private const int TokenBytes = 32;

        /// <summary>
        /// A new random token (256 bits, URL-safe) and its hash. The token goes to the browser cookie,
        /// only the hash to the database.
        /// </summary>
        public static (string Token, string Hash) Create()
        {
            var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(TokenBytes));

            return (token, Hash(token));
        }

        /// <summary>SHA-256 of the token as lower-case hex: a fixed-length lookup key that reveals nothing.</summary>
        public static string Hash(string token)
        {
            ArgumentNullException.ThrowIfNull(token);

            return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
        }
    }
}
