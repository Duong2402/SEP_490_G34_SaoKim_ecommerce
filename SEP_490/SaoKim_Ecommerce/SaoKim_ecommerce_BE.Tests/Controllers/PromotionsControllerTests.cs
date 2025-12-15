using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class PromotionsControllerTests
    {
        private readonly Mock<IPromotionService> _svcMock;
        private readonly PromotionsController _controller;

        public PromotionsControllerTests()
        {
            _svcMock = new Mock<IPromotionService>();
            _controller = new PromotionsController(_svcMock.Object);
        }

        #region List

        [Fact]
        public async Task List_ReturnsOk_WithPayload()
        {
            var items = new List<PromotionListItemDto>();
            _svcMock
                .Setup(s => s.ListAsync(null, null, 1, 10, "created", "desc"))
                .ReturnsAsync((items as IEnumerable<PromotionListItemDto>, 0));

            var result = await _controller.List(null, null);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(ok.Value);
        }

        [Fact]
        public async Task List_ForwardsParametersToService()
        {
            var items = new List<PromotionListItemDto>();
            _svcMock
                .Setup(s => s.ListAsync("flash", "active", 2, 5, "name", "asc"))
                .ReturnsAsync((items as IEnumerable<PromotionListItemDto>, 3));

            var result = await _controller.List("flash", "active", 2, 5, "name", "asc");

            Assert.IsType<OkObjectResult>(result);
            _svcMock.Verify(
                s => s.ListAsync("flash", "active", 2, 5, "name", "asc"),
                Times.Once);
        }

        [Fact]
        public async Task List_UsesDefaultPagingAndSorting_WhenNotProvided()
        {
            var items = new List<PromotionListItemDto>();
            _svcMock
                .Setup(s => s.ListAsync(null, null, 1, 10, "created", "desc"))
                .ReturnsAsync((items as IEnumerable<PromotionListItemDto>, 0));

            var result = await _controller.List(null, null);

            Assert.IsType<OkObjectResult>(result);
            _svcMock.Verify(
                s => s.ListAsync(null, null, 1, 10, "created", "desc"),
                Times.Once);
        }

        #endregion

        #region Detail

        [Fact]
        public async Task Detail_ReturnsNotFound_WhenPromotionNotExist()
        {
            _svcMock
                .Setup(s => s.GetAsync(999))
                .ReturnsAsync((PromotionDetailDto)null!);

            var result = await _controller.Detail(999);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Detail_ReturnsOk_WhenPromotionFound()
        {
            var dto = new PromotionDetailDto();
            _svcMock
                .Setup(s => s.GetAsync(1))
                .ReturnsAsync(dto);

            var result = await _controller.Detail(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(ok.Value);
        }

        #endregion

        #region Create

        [Fact]
        public async Task Create_ReturnsCreatedAtAction_WithNewId()
        {
            var dto = new PromotionCreateDto();
            _svcMock
                .Setup(s => s.CreateAsync(dto))
                .ReturnsAsync(123);

            var result = await _controller.Create(dto);

            var created = Assert.IsType<CreatedAtActionResult>(result);
            Assert.Equal(nameof(PromotionsController.Detail), created.ActionName);
            Assert.NotNull(created.Value);
        }

        [Fact]
        public async Task Create_CallsServiceWithDto()
        {
            var dto = new PromotionCreateDto();
            _svcMock
                .Setup(s => s.CreateAsync(dto))
                .ReturnsAsync(1);

            await _controller.Create(dto);

            _svcMock.Verify(
                s => s.CreateAsync(It.Is<PromotionCreateDto>(d => d == dto)),
                Times.Once);
        }

        #endregion

        #region Update

        [Fact]
        public async Task Update_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            var dto = new PromotionUpdateDto();
            _svcMock
                .Setup(s => s.UpdateAsync(1, dto))
                .ReturnsAsync(false);

            var result = await _controller.Update(1, dto);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Update_ReturnsOk_WhenServiceReturnsTrue()
        {
            var dto = new PromotionUpdateDto();
            _svcMock
                .Setup(s => s.UpdateAsync(1, dto))
                .ReturnsAsync(true);

            var result = await _controller.Update(1, dto);

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Update_CallsServiceWithCorrectParameters()
        {
            var dto = new PromotionUpdateDto();
            _svcMock
                .Setup(s => s.UpdateAsync(5, dto))
                .ReturnsAsync(true);

            await _controller.Update(5, dto);

            _svcMock.Verify(
                s => s.UpdateAsync(5, It.Is<PromotionUpdateDto>(d => d == dto)),
                Times.Once);
        }

        #endregion

        #region Delete

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            _svcMock
                .Setup(s => s.DeleteAsync(1))
                .ReturnsAsync(false);

            var result = await _controller.Delete(1);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task Delete_ReturnsOk_WhenServiceReturnsTrue()
        {
            _svcMock
                .Setup(s => s.DeleteAsync(1))
                .ReturnsAsync(true);

            var result = await _controller.Delete(1);

            Assert.IsType<OkObjectResult>(result);
        }

        #endregion

        #region AddProduct

        [Fact]
        public async Task AddProduct_ReturnsBadRequest_WhenServiceReturnsFalse()
        {
            var req = new PromotionsController.PromotionProductLinkReq
            {
                ProductId = 10,
                Note = "test"
            };

            _svcMock
                .Setup(s => s.AddProductAsync(1, 10, "test"))
                .ReturnsAsync(false);

            var result = await _controller.AddProduct(1, req);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task AddProduct_ReturnsOk_WhenServiceReturnsTrue()
        {
            var req = new PromotionsController.PromotionProductLinkReq
            {
                ProductId = 10,
                Note = "test"
            };

            _svcMock
                .Setup(s => s.AddProductAsync(1, 10, "test"))
                .ReturnsAsync(true);

            var result = await _controller.AddProduct(1, req);

            Assert.IsType<OkObjectResult>(result);
        }

        #endregion

        #region RemoveProduct

        [Fact]
        public async Task RemoveProduct_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            _svcMock
                .Setup(s => s.RemoveProductAsync(99))
                .ReturnsAsync(false);

            var result = await _controller.RemoveProduct(99);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task RemoveProduct_ReturnsOk_WhenServiceReturnsTrue()
        {
            _svcMock
                .Setup(s => s.RemoveProductAsync(2))
                .ReturnsAsync(true);

            var result = await _controller.RemoveProduct(2);

            Assert.IsType<OkObjectResult>(result);
        }

        #endregion
    }
}
