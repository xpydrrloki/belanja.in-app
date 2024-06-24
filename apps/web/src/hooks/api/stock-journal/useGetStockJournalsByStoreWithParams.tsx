import { IPaginationMeta, IPaginationQueries } from "@/types/pagination.type";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { Stock } from "@/types/stock.type";
import { axiosInstance } from "@/lib/axios";
import { useAppSelector } from "@/redux/hooks";
import { StockJournal } from "@/types/stockJournal.type";

interface IGetStocksQuery extends IPaginationQueries {
  search?: string;
  storeId?: string | undefined;
}

const useGetStockJournalsByStoreWithParams = (queries: IGetStocksQuery) => {
  const { token } = useAppSelector((state) => state.user);
  const [stockJournals, setStockJournals] = useState<StockJournal[] | []>([]);
  const [meta, setMeta] = useState<IPaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getStockJournalsByStore = async () => {
    try {
      const { data } = await axiosInstance.get("/stock-journals/filter", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        params: queries,
      });
      // console.log(data);
      setStockJournals(data.data);
      setMeta(data.meta);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getStockJournalsByStore();
  }, [queries?.page, queries?.search, queries?.storeId]);

  return {
    stockJournals,
    isLoading,
    meta,
    refetch: getStockJournalsByStore,
  };
};

export default useGetStockJournalsByStoreWithParams;
