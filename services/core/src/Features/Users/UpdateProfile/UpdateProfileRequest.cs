namespace QuestClass.Core.Features.Users.UpdateProfile
{
    /// <param name="Nickname">
    /// The new nickname: 3 to 24 characters after trimming, letters and digits of any script, spaces, '_', '-' and
    /// '.', starting and ending with a letter or digit. Unique across the system, ignoring letter case.
    /// </param>
    public sealed record UpdateProfileRequest(string Nickname);
}
