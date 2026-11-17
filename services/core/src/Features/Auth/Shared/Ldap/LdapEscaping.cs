using System.Text;

namespace QuestClass.Core.Features.Auth.Shared.Ldap
{
    /// <summary>
    /// Escaping of user input placed into LDAP strings (protection against LDAP injection).
    /// The login validator already allows only safe characters; this is the second line of defense.
    /// </summary>
    public static class LdapEscaping
    {
        /// <summary>Escapes a value placed into a distinguished name (RFC 4514).</summary>
        public static string EscapeDnValue(string value)
        {
            ArgumentNullException.ThrowIfNull(value);

            var builder = new StringBuilder(value.Length);

            for (var index = 0; index < value.Length; index++)
            {
                var character = value[index];
                var isFirst = index == 0;
                var isLast = index == value.Length - 1;

                if (character == '\0')
                {
                    builder.Append(@"\00");
                }
                else if (character is ',' or '+' or '"' or '\\' or '<' or '>' or ';' or '='
                    || (isFirst && character is ' ' or '#')
                    || (isLast && character == ' '))
                {
                    builder.Append('\\').Append(character);
                }
                else
                {
                    builder.Append(character);
                }
            }

            return builder.ToString();
        }

        /// <summary>Escapes a value placed into a search filter (RFC 4515).</summary>
        public static string EscapeFilterValue(string value)
        {
            ArgumentNullException.ThrowIfNull(value);

            var builder = new StringBuilder(value.Length);

            foreach (var character in value)
            {
                builder.Append(character switch
                {
                    '*' => @"\2a",
                    '(' => @"\28",
                    ')' => @"\29",
                    '\\' => @"\5c",
                    '\0' => @"\00",
                    _ => character.ToString()
                });
            }

            return builder.ToString();
        }
    }
}
