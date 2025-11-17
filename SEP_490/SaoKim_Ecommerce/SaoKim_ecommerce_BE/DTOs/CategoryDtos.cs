namespace SaoKim_ecommerce_BE.DTOs
{
    public class CategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Slug { get; set; }
    }

    public class CreateCategoryDto
    {
        public string Name { get; set; } = "";
    }

    public class UpdateCategoryDto : CreateCategoryDto
    {
        public string? Slug { get; set; }
    }
}
