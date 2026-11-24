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

        /// <summary>
        /// The roster of a group the caller may not see: missing, deleted, another teacher's, or a group the student is
        /// not in. One answer for all of them, with the same code as <see cref="NotFound"/>, so nobody learns that a
        /// group exists. The game service relies on it to check membership.
        /// </summary>
        public static Error RosterNotFound()
        {
            return Error.NotFound(
                "Groups.NotFound",
                "The group does not exist, or the caller is neither its teacher nor a student in it.");
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
