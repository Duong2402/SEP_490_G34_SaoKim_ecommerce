import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatVND = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export default function Revenue7DaysChart({ data }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickMargin={8} />
        <YAxis tickFormatter={(value) => Number(value || 0).toLocaleString("vi-VN")} />
        <Tooltip formatter={(value) => formatVND(value)} labelFormatter={(label) => label} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          name="Doanh thu"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
