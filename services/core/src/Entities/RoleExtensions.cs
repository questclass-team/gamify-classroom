namespace QuestClass.Core.Entities
{
    public static class RoleExtensions
    {
        /// <summary>
        /// Name used everywhere outside C#: API responses, token claims, authorization policies, database.
        /// </summary>
        public static string ToApiName(this Role role)
        {
            return role switch
            {
                Role.Student => "student",
                Role.Teacher => "teacher",
                Role.Admin => "admin",
                _ => throw new ArgumentOutOfRangeException(nameof(role), role, "Unknown role.")
            };
        }
    }
}
