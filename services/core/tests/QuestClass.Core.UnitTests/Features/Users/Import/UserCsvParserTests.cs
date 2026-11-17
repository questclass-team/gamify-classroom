using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Users.Import;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.Import
{
    public sealed class UserCsvParserTests
    {
        [Fact]
        public void Parse_ShouldReadRowsWithCommaDelimiter()
        {
            var rows = ParseRows("login,first_name,last_name,role\njkowalski,Jan,Kowalski,teacher\n");

            rows.ShouldHaveSingleItem().ShouldBe(new UserCsvRow(2, "jkowalski", "Jan", "Kowalski", "teacher"));
        }

        [Fact]
        public void Parse_ShouldUseSemicolonWhenTheHeaderHasIt()
        {
            var rows = ParseRows("login;first_name;last_name;role\r\nanowak;Anna;Nowak, Jr;student");

            rows.ShouldHaveSingleItem().LastName.ShouldBe("Nowak, Jr");
        }

        [Fact]
        public void Parse_ShouldIgnoreByteOrderMarkHeaderCaseAndSpaces()
        {
            var rows = ParseRows("﻿ Login , FIRST_NAME,last_name ,Role\n  jkowalski , Jan ,Kowalski, teacher ");

            rows.ShouldHaveSingleItem().ShouldBe(new UserCsvRow(2, "jkowalski", "Jan", "Kowalski", "teacher"));
        }

        [Fact]
        public void Parse_ShouldSkipEmptyLinesButKeepLineNumbersOfTheFile()
        {
            var rows = ParseRows("login,first_name,last_name,role\n\na,A,A,student\n   \nb,B,B,student\n");

            rows.Select(row => row.Line).ShouldBe([3, 5]);
        }

        [Fact]
        public void Parse_ShouldReadQuotedValuesAsExcelWritesThem()
        {
            var rows = ParseRows("login,first_name,last_name,role\njk,\"Jan, Maria\",\"O\"\"Brien\",teacher");

            var row = rows.ShouldHaveSingleItem();
            row.FirstName.ShouldBe("Jan, Maria");
            row.LastName.ShouldBe("O\"Brien");
        }

        [Fact]
        public void Parse_WhenCellsAreMissing_ShouldReturnThemEmpty()
        {
            var rows = ParseRows("login,first_name,last_name,role\njkowalski,Jan");

            rows.ShouldHaveSingleItem().ShouldBe(new UserCsvRow(2, "jkowalski", "Jan", string.Empty, string.Empty));
        }

        [Theory]
        [InlineData("")]
        [InlineData("jkowalski,Jan,Kowalski,teacher")]
        [InlineData("login,first_name,last_name")]
        [InlineData("login,last_name,first_name,role")]
        [InlineData("login,first_name,last_name,role,email")]
        public void Parse_WhenHeaderIsMissingOrDifferent_ShouldFail(string text)
        {
            var result = UserCsvParser.Parse(text);

            result.IsFailure.ShouldBeTrue();
            result.Error.Type.ShouldBe(ErrorType.Validation);
            result.Error.Message.ShouldBe("The first line must be the header: login,first_name,last_name,role.");
        }

        private static IReadOnlyList<UserCsvRow> ParseRows(string text)
        {
            var result = UserCsvParser.Parse(text);

            result.IsSuccess.ShouldBeTrue();
            return result.Value;
        }
    }
}
