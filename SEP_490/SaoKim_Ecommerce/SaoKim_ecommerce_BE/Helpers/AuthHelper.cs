namespace SaoKim_ecommerce_BE.Helpers
{
    public static class AuthHelper
    {
        public static bool HasLetterAndDigit(string password)
        {
            bool hasLetter = password.Any(char.IsLetter);
            bool hasDigit = password.Any(char.IsDigit);
            return hasLetter && hasDigit;
        }
    }
}
