namespace QuestClass.Core.Features.Users.Import
{
    /// <summary>multipart/form-data with the CSV in the field <c>file</c>.</summary>
    public sealed class ImportUsersRequest
    {
        /// <summary>CSV, UTF-8, header <c>login,first_name,last_name,role</c>, delimiter <c>,</c> or <c>;</c>.</summary>
        public IFormFile? File { get; init; }
    }
}
