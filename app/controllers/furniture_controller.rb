class FurnitureController < ApplicationController
  before_filter :authenticate, :except => [:show, :index]
  
  def index
    @furniture = Furniture.find_for_index(params)
  end
  
  def show
    @furniture = Furniture.find(params[:id])
    render :layout => false
  end
end
