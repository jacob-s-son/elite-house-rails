class CategoriesController < ApplicationController
  def index
  end
  
  def contacts
    render :template => ( I18n.locale == :lv ? "categories/contacts" : "categories/contacts_ru" ) 
  end
  
  def under_construction
    render :text => "Lapa tiek atjaunota! <br> Сайт дополняется!"
  end
end
