class Category < ActiveRecord::Base
  has_many :sub_categories
  
  def name
    read_attribute( I18n.locale == 'lv' ? :name : :name_ru ) 
  end
  
  def key
    self.id
  end
end
