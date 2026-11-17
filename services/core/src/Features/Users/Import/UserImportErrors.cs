using QuestClass.Core.Common.Results;

namespace QuestClass.Core.Features.Users.Import
{
    public static class UserImportErrors
    {
        public static Error InvalidHeader()
        {
            return Error.Validation(
                "Users.InvalidImportHeader",
                $"The first line must be the header: {string.Join(',', UserCsvParser.Header)}.");
        }

        /// <summary>
        /// Excel on a Polish Windows may save CSV as Windows-1250; reading it as UTF-8 would corrupt names like
        /// "Wiśniewski", so such a file is refused instead.
        /// </summary>
        public static Error NotUtf8()
        {
            return Error.Validation(
                "Users.ImportNotUtf8",
                "The file must be saved as UTF-8 (in Excel: \"CSV UTF-8\").");
        }

        public static Error MissingFile()
        {
            return Error.Validation(
                "Users.ImportFileMissing",
                "Attach the CSV file in the multipart field \"file\".");
        }

        public static Error FileTooLarge(long maxBytes)
        {
            return Error.TooLarge(
                "Users.ImportFileTooLarge",
                $"The file must not be larger than {maxBytes / 1024} KB.");
        }
    }
}
