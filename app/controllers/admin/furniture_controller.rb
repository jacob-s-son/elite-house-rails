class Admin::FurnitureController < Admin::BaseController
  before_filter :load_furniture , :only => [:edit, :update, :destroy]

  def index
    @furniture = Furniture.find(:all, :order => "priority DESC")
  end

  def new
    @furniture = Furniture.new
    10.times { @furniture.images.build }
  end

  def edit
    number = 10 - @furniture.images.size
    number.times { @furniture.images.build }
    render :new
  end

  def create
    @furniture = Furniture.new(params[:furniture])

    if @furniture.save
      redirect_to admin_furniture_index_path
    else
      render :new
    end
  end

  def update
    if @furniture.update_attributes(params[:furniture])
      redirect_to admin_furniture_index_path
    else
      render :new
    end
  end
  
  def destroy
    @furniture.destroy
    redirect_to admin_furniture_index_path
  end

  private

  def load_furniture
    @furniture = Furniture.find(params[:id])
  end
end

