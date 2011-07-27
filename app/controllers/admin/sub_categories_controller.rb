class Admin::SubCategoriesController < Admin::BaseController
  before_filter :load_sub_category , :only => [:edit, :update]
  
  def index
    @sub_categories = SubCategory.find(:all, :order => "priority DESC")
  end
  
  def new
    @sub_category = SubCategory.new
  end
  
  def edit
    render :new
  end
  
  def create
    @sub_category = SubCategory.new(params[:sub_category])
    
    if @sub_category.save
      redirect_to admin_sub_categories_path
    else
      render :new
    end
  end
  
  def update
    if @sub_category.update_attributes(params[:sub_category])
      redirect_to admin_sub_categories_path
    else
      render :new
    end
  end
  
  private
  
  def load_sub_category
    @sub_category = SubCategory.find(params[:id])
  end
end
