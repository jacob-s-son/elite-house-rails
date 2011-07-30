class Admin::CategoriesController < Admin::BaseController
  before_filter :load_category , :only => [:edit, :update, :destroy]
  
  def index
    @categories = Category.find(:all, :order => "priority DESC")
  end
  
  def new
    @category = Category.new
  end
  
  def edit
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
    if @category.update_attributes(params[:category])
      redirect_to admin_categories_path
    else
      render :new
    end
  end
  
  def destroy
    @category.destroy
    redirect_to admin_categories_path
  end
  
  private
  
  def load_category
    @category = Category.find(params[:id])
  end
end
