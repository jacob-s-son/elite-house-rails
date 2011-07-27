class Category < ActiveRecord::Base
  has_many :sub_categories
  
  def name
    read_attribute( I18n.locale == 'lv' ? :name : :name_ru ) 
  end
  
  def url_for_category(category)
    if category.sub_categories.size > 1
      category_sub_categories :category => category
    elsif category.sub_categories.size == 1
      sub_category_furniture_index_path :sub_category => category.sub_categories.first
    else
      category_furniture_index_path(:category_id => category)
    end
  end
  
  def url
    if self.sub_categories.size > 1
      category_sub_categories :category => self
    elsif self.sub_categories.size == 1
      sub_category_furniture_index_path :sub_category => self.sub_categories.first
    else
      category_furniture_index_path(:category_id => self)
    end
  end
  
  # def sub_menu_items(category)
  #   category.sub_categories.map do |sc|
  #     {
  #       :key => sc.key,
  #       :name => sc.name,
  #       :url => sub_category_furniture_index_path( :sub_category => sc )
  #     }
  #   end
  # end
  
  def self.menu_items
    result = Category.all.map do |category|
      {
        :name => category.name,
        :key => "main_#{category.key}".to_sym,
        :url => url_for_category(category)
        # :items => sub_menu_items(category)
      }
    end
    
    debugger
    result
  end
end
