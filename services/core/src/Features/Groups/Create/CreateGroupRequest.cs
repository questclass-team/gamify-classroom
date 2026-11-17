namespace QuestClass.Core.Features.Groups.Create
{
    /// <param name="Name">Group name, 1 to 100 characters after trimming. Need not be unique.</param>
    public sealed record CreateGroupRequest(string Name);
}
