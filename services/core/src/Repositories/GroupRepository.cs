using Microsoft.EntityFrameworkCore;
using Npgsql;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Common.Persistence.SoftDelete;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public sealed class GroupRepository : IGroupRepository
    {
        private readonly CoreDbContext _dbContext;

        public GroupRepository(CoreDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task AddAsync(Group group, CancellationToken cancellationToken = default)
        {
            _dbContext.Groups.Add(group);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<GroupWithStudentCount>> GetByTeacherAsync(
            Guid teacherId,
            CancellationToken cancellationToken = default)
        {
            // Users has the soft delete filter, so the join drops deleted student accounts from the count.
            return await _dbContext.Groups
                .AsNoTracking()
                .Where(group => group.TeacherId == teacherId)
                .OrderBy(group => EF.Functions.Collate(group.Name, Collations.Polish))
                .ThenBy(group => group.CreatedAt)
                .Select(group => new GroupWithStudentCount(
                    group,
                    _dbContext.GroupMembers.Count(member =>
                        member.GroupId == group.Id &&
                        _dbContext.Users.Any(user => user.Id == member.StudentId))))
                .ToListAsync(cancellationToken);
        }

        public Task<Group?> GetOwnedAsync(Guid groupId, Guid teacherId, CancellationToken cancellationToken = default)
        {
            return _dbContext.Groups
                .SingleOrDefaultAsync(
                    group => group.Id == groupId && group.TeacherId == teacherId,
                    cancellationToken);
        }

        public async Task<IReadOnlyList<StudentGroup>> GetByStudentAsync(
            Guid studentId,
            CancellationToken cancellationToken = default)
        {
            // Served by the index on group_members.student_id. A deleted teacher account must not hide an active group,
            // so the soft delete filter is switched off; IgnoreQueryFilters applies to the whole query, so deleted
            // groups are left out by hand.
            return await (
                    from member in _dbContext.GroupMembers
                    join memberGroup in _dbContext.Groups on member.GroupId equals memberGroup.Id
                    join teacher in _dbContext.Users on memberGroup.TeacherId equals teacher.Id
                    where member.StudentId == studentId && !memberGroup.IsDeleted
                    orderby EF.Functions.Collate(memberGroup.Name, Collations.Polish),
                        memberGroup.CreatedAt,
                        memberGroup.Id
                    select new StudentGroup(memberGroup, teacher, member.AddedAt))
                .IgnoreQueryFilters([QueryFilters.SoftDelete])
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }

        public Task<Group?> GetForMemberAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken = default)
        {
            // Users has the soft delete filter: a deleted student account is no longer a member of anything.
            return _dbContext.Groups
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    group => group.Id == groupId &&
                        _dbContext.GroupMembers.Any(member =>
                            member.GroupId == group.Id &&
                            member.StudentId == studentId &&
                            _dbContext.Users.Any(user => user.Id == member.StudentId)),
                    cancellationToken);
        }

        public async Task<IReadOnlyList<RosterEntry>> GetRosterAsync(
            Guid groupId,
            CancellationToken cancellationToken = default)
        {
            // Only id and nickname leave the database; names and logins are never read here.
            return await (
                    from member in _dbContext.GroupMembers
                    join user in _dbContext.Users on member.StudentId equals user.Id
                    where member.GroupId == groupId
                    orderby user.Nickname == null, EF.Functions.Collate(user.Nickname, Collations.Polish), user.Id
                    select new RosterEntry(user.Id, user.Nickname))
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<GroupStudent>> GetStudentsAsync(
            Guid groupId,
            CancellationToken cancellationToken = default)
        {
            return await (
                    from member in _dbContext.GroupMembers
                    join user in _dbContext.Users on member.StudentId equals user.Id
                    where member.GroupId == groupId
                    orderby EF.Functions.Collate(user.FirstName, Collations.Polish),
                        EF.Functions.Collate(user.LastName, Collations.Polish),
                        user.Login
                    select new GroupStudent(user, member.AddedAt))
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }

        public Task<GroupMember?> GetMemberAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken = default)
        {
            return _dbContext.GroupMembers
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    member => member.GroupId == groupId && member.StudentId == studentId,
                    cancellationToken);
        }

        public async Task<bool> TryAddMemberAsync(GroupMember member, CancellationToken cancellationToken = default)
        {
            _dbContext.GroupMembers.Add(member);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }
            catch (DbUpdateException exception)
                when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // Two requests added the same student at once: the primary key let only one of them in.
                _dbContext.Entry(member).State = EntityState.Detached;
                return false;
            }
        }

        public Task RemoveMemberAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken = default)
        {
            // GroupMember is not soft-deletable, so a bulk delete is fine here.
            return _dbContext.GroupMembers
                .Where(member => member.GroupId == groupId && member.StudentId == studentId)
                .ExecuteDeleteAsync(cancellationToken);
        }
    }
}
