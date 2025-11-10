using System.Globalization;
using System.Text;

namespace SaoKim_ecommerce_BE.Services
{
    public static class ProductCodeGenerator
    {
        public static string Generate(string productName, int productId)
        {
            string shortName = GetShortName(productName);
            return $"{shortName}-{productId:D3}";
        }

        
        private static string GetShortName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "SP";

            string normalized = name.Normalize(NormalizationForm.FormD);
            var chars = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
            string clean = new string(chars.ToArray()).Normalize(NormalizationForm.FormC);

            var words = clean.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            string shortName = string.Join("", words.Take(2).Select(w => char.ToUpper(w[0])));

            return shortName.Length > 0 ? shortName : "SP";
        }
    }
}
