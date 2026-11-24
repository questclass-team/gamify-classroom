using QuestClass.Core.Common.Results;

namespace QuestClass.Core.Features.Users.Shared
{
    public static class ProfileErrors
    {
        /// <summary>
        /// The token says student, but the account in the database no longer is one (its role was changed after
        /// login). Only students have a profile.
        /// </summary>
        public static Error StudentOnly()
        {
            return Error.Forbidden(
                "Profile.StudentOnly",
                "Only student accounts have a profile.");
        }

        /// <summary>Another account already has this nickname, in any letter case.</summary>
        public static Error NicknameTaken()
        {
            return Error.Conflict(
                "Profile.NicknameTaken",
                "This nickname is already taken. Choose another one.");
        }
    }
}
