namespace QuestClass.Core.Common.Persistence
{
    /// <summary>Collations for <c>EF.Functions.Collate</c> in queries and for SQL of computed columns.</summary>
    public static class Collations
    {
        /// <summary>
        /// Polish ICU collation, built into PostgreSQL. The default collation of the Alpine PostgreSQL image sorts
        /// by bytes, which puts "algorytmy" after "Zajęcia" and "Ćwiczenia" after both; this one sorts as a Polish
        /// user expects.
        /// </summary>
        public const string Polish = "pl-x-icu";

        /// <summary>
        /// Language-neutral ICU collation, built into PostgreSQL. Case mapping under it (<c>lower</c>) covers letters of
        /// every script, not only ASCII as under the database default.
        /// </summary>
        public const string Unicode = "und-x-icu";
    }
}
