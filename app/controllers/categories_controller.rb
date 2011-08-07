class CategoriesController < ApplicationController
  def index
  end
  
  def contacts
    render :template => ( I18n.locale == :lv ? "categories/contacts" : "categories/contacts_ru" ) 
  end
end
