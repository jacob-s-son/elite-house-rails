class CategoriesController < ApplicationController
  before_filter :authenticate, :except => [:show, :index]
  
  def index
    debugger
  end
  
  def new
    @category = Category.new
  end
  
  def edit
    @category = Category.find(params[:category_id])
    render :new
  end
  
  def create
    if Category.create(params[:category])
      redirect_to admin_categories_path
    else
      render :new
    end
  end
  
  def update
    @category = Category.find(params[:category][:id])
    
    if @category.update_attributes(params[:category])
      redirect_to admin_categories_path
    else
      render :new
    end
  end
end
