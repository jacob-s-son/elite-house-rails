class CategoriesController < ApplicationController
  def index
  end
  
  def contacts
    render :template => ( I18n.locale == :lv ? "categories/contacts" : "categories/contacts_ru" ) 
  end
  
  def sitemap
    @categories = Category.all
    @sub_categories = SubCategory.all
  end
end
