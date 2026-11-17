namespace QuestClass.Core.Features.Users.Import
{
    /// <summary>Result of an import, as <c>UserImportReport</c> in <c>frontend/src/api/types.ts</c>.</summary>
    /// <param name="Created">Accounts that can now log in (new or restored), in file order.</param>
    /// <param name="Skipped">Rows that were not imported, with the reason.</param>
    public sealed record UserImportReport(IReadOnlyList<ImportedUser> Created, IReadOnlyList<SkippedImportRow> Skipped);

    /// <param name="Line">Line in the file, the header is line 1.</param>
    /// <param name="Login">Login, lower-case.</param>
    /// <param name="DisplayName">"First Last".</param>
    /// <param name="Role">"student", "teacher" or "admin".</param>
    public sealed record ImportedUser(int Line, string Login, string DisplayName, string Role);

    /// <param name="Line">Line in the file, the header is line 1.</param>
    /// <param name="Login">Login, lower-case; null when the row has none.</param>
    /// <param name="Reason">One of <see cref="ImportSkipReasons"/>.</param>
    public sealed record SkippedImportRow(int Line, string? Login, string Reason);

    public static class ImportSkipReasons
    {
        /// <summary>An active account with this login exists; it is left unchanged.</summary>
        public const string AlreadyExists = "already_exists";

        /// <summary>The login appears on an earlier line of the same file.</summary>
        public const string DuplicateInFile = "duplicate_in_file";

        /// <summary>Login, first name, last name or role is empty.</summary>
        public const string MissingField = "missing_field";

        /// <summary>The login has characters a faculty login cannot have, or is too long.</summary>
        public const string InvalidLogin = "invalid_login";

        /// <summary>The role is not student, teacher or admin.</summary>
        public const string InvalidRole = "invalid_role";
    }
}
