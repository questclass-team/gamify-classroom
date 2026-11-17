using QuestClass.Core.Common.Results;

namespace QuestClass.Core.Features.Groups.Shared
{
    public static class GroupErrors
    {
        /// <summary>
        /// Also for another teacher's group: 404, not 403, so the answer does not reveal that the group exists.
        /// The game service relies on it to check that a group is the caller's.
        /// </summary>
        public static Error NotFound()
        {
            return Error.NotFound(
                "Groups.NotFound",
                "The group does not exist or belongs to another teacher.");
        }

        /// <summary>Only imported student accounts can join a group: not teachers, admins or deleted accounts.</summary>
        public static Error StudentNotFound()
        {
            return Error.NotFound(
                "Groups.StudentNotFound",
                "No student account with this id exists.");
        }
    }
}
