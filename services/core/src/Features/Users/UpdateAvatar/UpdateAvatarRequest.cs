namespace QuestClass.Core.Features.Users.UpdateAvatar
{
    /// <param name="Avatar">
    /// One of the ready-made avatar keys: fox, owl, hedgehog, cat, wolf, raven, dragon, phoenix, comet, star, moon,
    /// planet, spark, aurora, wave, galaxy. Null (or no field) removes the avatar.
    /// </param>
    public sealed record UpdateAvatarRequest(string? Avatar);
}
