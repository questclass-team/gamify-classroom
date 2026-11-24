using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public interface IGroupRepository
    {
        Task AddAsync(Group group, CancellationToken cancellationToken = default);

        /// <summary>
        /// The teacher's groups with their number of students, by name in Polish alphabetical order. Deleted
        /// groups and deleted student accounts are left out.
        /// </summary>
        Task<IReadOnlyList<GroupWithStudentCount>> GetByTeacherAsync(
            Guid teacherId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// The group, or null when it does not exist, is deleted or belongs to another teacher: callers cannot tell
        /// these cases apart, so a foreign group looks like a missing one.
        /// </summary>
        Task<Group?> GetOwnedAsync(Guid groupId, Guid teacherId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Groups the student is a member of, with their teacher and when the student joined, by name in Polish
        /// alphabetical order like <see cref="GetByTeacherAsync"/>. Deleted groups are left out; a group whose teacher
        /// account was deleted stays, because the group itself is still active.
        /// </summary>
        Task<IReadOnlyList<StudentGroup>> GetByStudentAsync(Guid studentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// The group, or null when it does not exist, is deleted or the student is not its member: callers cannot tell
        /// these cases apart.
        /// </summary>
        Task<Group?> GetForMemberAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Students of the group with only their nicknames and avatars, never names or logins (NFR-03): by nickname in
        /// Polish alphabetical order, students without one last, then by id. Deleted student accounts are left out.
        /// </summary>
        Task<IReadOnlyList<RosterEntry>> GetRosterAsync(Guid groupId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Students of the group with the time they joined, by name in Polish alphabetical order. Deleted student
        /// accounts are left out.
        /// </summary>
        Task<IReadOnlyList<GroupStudent>> GetStudentsAsync(Guid groupId, CancellationToken cancellationToken = default);

        /// <summary>The membership of the student in the group, or null when the student is not in it.</summary>
        Task<GroupMember?> GetMemberAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Adds the membership; false when the student is already in the group (also when a concurrent request added
        /// them a moment earlier). Never creates a second membership.
        /// </summary>
        Task<bool> TryAddMemberAsync(GroupMember member, CancellationToken cancellationToken = default);

        /// <summary>Removes the student from the group; does nothing when they are not in it.</summary>
        Task RemoveMemberAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken = default);
    }

    public sealed record GroupWithStudentCount(Group Group, int StudentCount);

    public sealed record GroupStudent(User Student, DateTimeOffset AddedAt);

    public sealed record StudentGroup(Group Group, User Teacher, DateTimeOffset JoinedAt);

    public sealed record RosterEntry(Guid StudentId, string? Nickname, string? Avatar);
}
