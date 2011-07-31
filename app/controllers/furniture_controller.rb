class FurnitureController < ApplicationController
  before_filter :authenticate, :except => [:show, :index]
  
  def index
    @furniture = Furniture.find_for_index(params)
    @category = Category.find(params[:category_id])  if params[:category_id]
    @sub_category = SubCategory.find(params[:sub_category_id]) if params[:sub_category_id]
  end
  
  def show
    @furniture = Furniture.find(params[:id])
    render :layout => false
  end
end
