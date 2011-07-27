class Category < ActiveRecord::Base
  has_many :sub_categories
  has_many :furniture
  after_initialize :set_pritority
  
  def name
    read_attribute( I18n.locale == 'lv' ? :name : :name_ru ) 
  end
  
  private
  
  def set_pritority
    self.priority = Category.count if self.priority.nil?
  end
end
