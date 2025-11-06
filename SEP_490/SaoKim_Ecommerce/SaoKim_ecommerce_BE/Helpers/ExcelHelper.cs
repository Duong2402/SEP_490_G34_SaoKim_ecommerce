using ClosedXML.Excel;

namespace SaoKim_ecommerce_BE.Helpers
{
    public static class ExcelHelper
    {
        public static DateTime ParseExcelDate(IXLCell cell)
        {
            try
            {
                if (cell.IsEmpty()) return DateTime.UtcNow;

                DateTime date;
                if (cell.DataType == XLDataType.DateTime)
                    date = cell.GetDateTime();
                else if (cell.DataType == XLDataType.Number)
                    date = DateTime.FromOADate(cell.GetDouble());
                else if (DateTime.TryParse(cell.GetString(), out var dt))
                    date = dt;
                else
                    throw new Exception($"Giá trị ngày không hợp lệ tại ô {cell.Address}");

                return DateTime.SpecifyKind(date, DateTimeKind.Utc);
            }
            catch
            {
                return DateTime.UtcNow;
            }
        }

        public static int SafeInt(double value)
        {
            return (int)Math.Round(value);
        }

        public static decimal SafeDecimal(double value)
        {
            return Convert.ToDecimal(value);
        }
    }
}
