class SubCategory < ActiveRecord::Base
  before_filter :authenticate, :except => [:show, :index]
  
  def name
    read_attribute( I18n.locale == 'lv' ? :name : :name_ru ) 
  end
  
  def key
    self.id
  end
end
