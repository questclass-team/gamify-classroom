using System.Text;
using QuestClass.Core.Common.Results;

namespace QuestClass.Core.Features.Users.Import
{
    /// <summary>
    /// Reads the account import file. The first line is the header <c>login,first_name,last_name,role</c> (any letter
    /// case); the delimiter is <c>;</c> when the header contains it, otherwise <c>,</c>. Values may be quoted, as Excel
    /// writes them (<c>"Kowalski, Jan"</c>, <c>""</c> for a quote). Lines are numbered from 1, the header included;
    /// empty lines are skipped.
    /// </summary>
    public static class UserCsvParser
    {
        public static readonly IReadOnlyList<string> Header = ["login", "first_name", "last_name", "role"];

        public static Result<IReadOnlyList<UserCsvRow>> Parse(string text)
        {
            ArgumentNullException.ThrowIfNull(text);

            var lines = text.TrimStart('﻿').Split(["\r\n", "\n", "\r"], StringSplitOptions.None);
            var delimiter = lines[0].Contains(';') ? ';' : ',';

            var header = SplitLine(lines[0], delimiter).Select(cell => cell.ToLowerInvariant());
            if (!header.SequenceEqual(Header))
            {
                return Result<IReadOnlyList<UserCsvRow>>.Failure(UserImportErrors.InvalidHeader());
            }

            var rows = new List<UserCsvRow>();

            for (var index = 1; index < lines.Length; index++)
            {
                if (string.IsNullOrWhiteSpace(lines[index]))
                {
                    continue;
                }

                var cells = SplitLine(lines[index], delimiter);
                rows.Add(new UserCsvRow(
                    Line: index + 1,
                    Login: CellAt(cells, 0),
                    FirstName: CellAt(cells, 1),
                    LastName: CellAt(cells, 2),
                    Role: CellAt(cells, 3)));
            }

            return Result<IReadOnlyList<UserCsvRow>>.Success(rows);
        }

        private static string CellAt(List<string> cells, int index)
        {
            return index < cells.Count ? cells[index] : string.Empty;
        }

        /// <summary>Splits one line into trimmed cells, honouring double quotes.</summary>
        private static List<string> SplitLine(string line, char delimiter)
        {
            var cells = new List<string>();
            var cell = new StringBuilder();
            var inQuotes = false;

            for (var index = 0; index < line.Length; index++)
            {
                var character = line[index];

                if (inQuotes)
                {
                    if (character != '"')
                    {
                        cell.Append(character);
                    }
                    else if (index + 1 < line.Length && line[index + 1] == '"')
                    {
                        cell.Append('"');
                        index++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else if (character == '"')
                {
                    inQuotes = true;
                }
                else if (character == delimiter)
                {
                    cells.Add(cell.ToString().Trim());
                    cell.Clear();
                }
                else
                {
                    cell.Append(character);
                }
            }

            cells.Add(cell.ToString().Trim());

            return cells;
        }
    }

    /// <summary>One data line of the file, cells trimmed but otherwise as written.</summary>
    public sealed record UserCsvRow(int Line, string Login, string FirstName, string LastName, string Role);
}
