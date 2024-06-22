import { FormInput } from "@/components/FormInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import useGetCategories from "@/hooks/api/category/useGetCategories";
import useGetProduct from "@/hooks/api/product/useGetProduct";
import useUpdateProduct from "@/hooks/api/product/useUpdateProduct";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { TEditProductSchema, editProductSchema } from "./EditProductSchema";
import ImageUploader from "@/components/FormInputImages";
const Select = dynamic(() => import("react-select"), { ssr: false });
interface DialogEditProductProps {
  productId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refetch: () => void;
}
const DialogEditProduct: React.FC<DialogEditProductProps> = ({
  productId,
  open,
  onOpenChange,
  refetch,
}) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const { product } = useGetProduct(productId);
  const { updateProduct, isLoading } = useUpdateProduct(productId);
  const methods = useForm<TEditProductSchema>({
    mode: "all",
    resolver: zodResolver(editProductSchema),
  });
  const {
    reset,
    handleSubmit,
    getValues,
    setValue,
    control,
    formState: { errors },
  } = methods;
  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      const allFiles = [...(getValues("images") || []), ...newFiles];
      setValue("images", allFiles);
      setImagePreviews([
        ...imagePreviews,
        ...newFiles.map((file) => URL.createObjectURL(file)),
      ]);
    }
  };
  const handleRemoveImage = (index: number) => {
    const updatedImages = [...(getValues("images") || [])];
    updatedImages.splice(index, 1);
    setValue("images", updatedImages);

    const updatedPreviews = [...imagePreviews];
    updatedPreviews.splice(index, 1);
    setImagePreviews(updatedPreviews);
  };
  useEffect(() => {
    if (product) {
      const loadImages = async () => {
        const previews = product.images.map(
          (image) => `http://localhost:8000/api/assets${image.images}`,
        );
        setImagePreviews(previews);
        const imageFiles = await Promise.all(
          product.images.map(async (image) => {
            const response = await fetch(
              `http://localhost:8000/api/assets${image.images}`,
            );
            const blob = await response.blob();
            return new File([blob], image.images.split("/").pop() || "", {
              type: blob.type,
            });
          }),
        );
        setValue("images", imageFiles);
        reset({
          name: product.name,
          description: product.description,
          price: product.price,
          weight: product.weight,
          categories: product.categories.map((cat) => ({
            value: cat.category.id.toString(),
            label: cat.category.name,
          })),
          images: imageFiles,
        });
      };
      loadImages();
    }
  }, [product, reset, setValue]);
  const onSubmit: SubmitHandler<TEditProductSchema> = async (data) => {
    console.log(data);
    await updateProduct(data);
    onOpenChange(false);
    refetch();
  };
  const { categories } = useGetCategories();
  const categoryOptions = categories.map((category) => ({
    value: category.id.toString(),
    label: category.name,
  }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Update Product</DialogTitle>
              <DialogDescription>
                Update product with categories and images
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <FormInput<TEditProductSchema>
                name="name"
                label="Name"
                type="text"
                placeholder="Name"
              />
              <div className="mt-2">
                <FormInput<TEditProductSchema>
                  name="description"
                  label="Description"
                  type="text"
                  placeholder="Description"
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <Label>Price</Label>
                  <FormInput<TEditProductSchema>
                    name="price"
                    label=""
                    type="number"
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-1">
                  <Label>Weight</Label>
                  <FormInput<TEditProductSchema>
                    name="weight"
                    label=""
                    type="number"
                    placeholder="Weight"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Categories</Label>
                <Controller
                  name="categories"
                  control={control}
                  render={({ field: { value, onBlur, onChange, name } }) => (
                    <Select
                      isMulti
                      value={value}
                      onBlur={onBlur}
                      name={name}
                      options={categoryOptions}
                      onChange={(selectedOption) => onChange(selectedOption)}
                    />
                  )}
                />
                {errors.categories && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.categories.message}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <ImageUploader
                  name="images"
                  label="Images"
                  imagePreviews={imagePreviews}
                  handleFileChange={handleFileChange}
                  handleRemoveImage={handleRemoveImage}
                />
              </div>
            </div>
            <DialogFooter className="mt-4 flex justify-end">
              <Button disabled={isLoading} type="submit" className="px-4 py-2">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Loading" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default DialogEditProduct;
