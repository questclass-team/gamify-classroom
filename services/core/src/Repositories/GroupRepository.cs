using Microsoft.EntityFrameworkCore;
using QuestClass.Core.Common.Persistence;
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
    }
}
