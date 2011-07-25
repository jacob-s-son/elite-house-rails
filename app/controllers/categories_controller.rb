class CategoriesController < ApplicationController
  before_filter :authenticate, :except => [:show, :index]
  
  def new
    @category = Category.new
  end
  
  def create
    Category.create(params[:category])
  end
  
  def update
    @category = Category.find(params[:category][:id])
    
    if @category.update_attributes(params[:category])
      redirect_to 
  end
end
