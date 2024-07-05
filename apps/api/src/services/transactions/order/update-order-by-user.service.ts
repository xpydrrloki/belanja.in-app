import prisma from '@/prisma';
import { OrderStatus } from '@prisma/client';

interface CancelUserOrderArgs {
  userId: number;
  orderId: number;
}
export const updateOrderByUserService = async (body: CancelUserOrderArgs) => {
  try {
    const { orderId, userId } = body;

    const findUser = await prisma.user.findFirst({ where: { id: userId } });
    if (!findUser) {
      throw new Error('User not found');
    }

    const findOrder = await prisma.order.findFirst({
      where: { id: orderId },
      include: { Payment: true, OrderItems: true },
    });
    if (!findOrder) {
      throw new Error('Order not found');
    }

    const cancelOrder = await prisma.order.update({
      where: { id: orderId, userId },
      data: { status: OrderStatus.ORDER_CANCELLED },
    });

    await prisma.payment.update({
      where: { id: findOrder.Payment?.id },
      data: {
        paymentStatus: 'CANCELLED',
      },
    });
    const refundJournal = await Promise.all(
      findOrder.OrderItems.map(async (val) => {
        await prisma.stockJournal.create({
          data: {
            quantity: val.qty,
            storeId: findOrder.storeId,
            toStoreId: findOrder.storeId,
            productId: val.productId,
            status: 'AUTOMATED',
            type: 'REFUND',
            JournalDetail: { create: { toStoreId: findOrder.storeId } },
          },
        });
      }),
    );
    for (const orderItem of findOrder.OrderItems) {
      // Find the storeProduct for the current productId and storeId
      const storeProduct = await prisma.storeProduct.findUnique({
        where: {
          storeId_productId: {
            storeId: findOrder.storeId,
            productId: orderItem.productId,
          },
        },
      });

      if (!storeProduct) {
        throw new Error(
          `StoreProduct not found for storeId: ${findOrder.storeId} and productId: ${orderItem.productId}`,
        );
      }

      // Update the storeProduct quantity
      const updatedStoreProduct = await prisma.storeProduct.update({
        where: { id: storeProduct.id },
        data: {
          qty: {
            increment: orderItem.qty, // Decrease qty by orderItem.qty
          },
        },
      });
    }

    if (findOrder.status == 'WAITING_FOR_PAYMENT') {
      await prisma.order.update({
        where: { id: findOrder.id },
        data: { status: 'ORDER_CANCELLED' },
      });
    }

    return { message: 'Order has been cancelled' };
  } catch (error) {
    throw error;
  }
};
