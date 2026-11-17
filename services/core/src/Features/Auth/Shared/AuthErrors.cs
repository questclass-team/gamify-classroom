using QuestClass.Core.Common.Results;

namespace QuestClass.Core.Features.Auth.Shared
{
    public static class AuthErrors
    {
        /// <summary>
        /// Wrong password or a login unknown to the directory: one answer for both, so the response
        /// does not reveal which logins exist.
        /// </summary>
        public static Error InvalidCredentials()
        {
            return Error.Unauthorized(
                "Auth.InvalidCredentials",
                "Invalid login or password.");
        }

        /// <summary>
        /// The token is valid, but its user no longer exists (e.g. deleted after login): the session is over.
        /// 401, so the frontend logs the user out.
        /// </summary>
        public static Error SessionUserNotFound()
        {
            return Error.Unauthorized(
                "Auth.SessionUserNotFound",
                "The account of this session no longer exists. Please log in again.");
        }

        /// <summary>The directory accepted the password, but the account was never imported from CSV.</summary>
        public static Error AccountNotImported()
        {
            return Error.Forbidden(
                "Auth.AccountNotImported",
                "This faculty account has no access to QuestClass. Ask the administrator to import it.");
        }
    }
}
