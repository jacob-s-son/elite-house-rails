class Admin::FurnitureController < Admin::BaseController
  before_filter :load_furniture , :only => [:edit, :update]

  def index
    @furniture = Furniture.find(:all, :order => "priority DESC")
  end

  def new
    @furniture = Furniture.new
  end

  def edit
    render :new
  end

  def create
    @furniture = Furniture.new(params[:sub_category])

    if @furniture.save
      redirect_to admin_furniture_index_path
    else
      render :new
    end
  end

  def update
    if @furniture.update_attributes(params[:sub_category])
      redirect_to admin_furniture_index_path
    else
      render :new
    end
  end

  private

  def load_furniture
    @furniture = Furniture.find(params[:id])
  end
end

