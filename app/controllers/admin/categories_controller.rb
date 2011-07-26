class Admin::CategoriesController < Admin::BaseController 
  def index
    @categories = Category.all
  end
  
  def new
    @category = Category.new
  end
  
  def edit
    @category = Category.find(params[:id])
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
    debugger
    @category = Category.find(params[:id])
    
    if @category.update_attributes(params[:category])
      redirect_to admin_categories_path
    else
      render :new
    end
  end
end
